import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  Platform
} from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { auth } from '../config/firebaseConfig';
import { ref, get, set, onValue, off } from 'firebase/database';
import { realtimeDb } from '../config/firebaseConfig';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('🔔 Notification handler called:', notification);
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export default function ProfessionalHomeScreen({ onNavigateToProfile, onNavigateToMenu }) {
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('@U');
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [acceptedReport, setAcceptedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [showReportsHistory, setShowReportsHistory] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notificationStatus, setNotificationStatus] = useState(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  const registerForPushNotificationsAsync = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setNotificationStatus(finalStatus);

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Get projectId from app.json or Constants
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.expoConfig?.extra?.expoProjectId ||
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.projectId; // Fallback to app.json projectId

      let tokenResponse;
      try {
        if (projectId) {
          tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        } else {
          // Try without projectId (for Expo Go or if projectId not found)
          tokenResponse = await Notifications.getExpoPushTokenAsync();
        }
      } catch (tokenError) {
        console.error('Error getting push token:', tokenError);
        // If running in Expo Go or projectId not configured, skip token registration
        if (tokenError.message?.includes('projectId') || tokenError.message?.includes('FirebaseApp')) {
          console.log('Skipping push token registration - not available in current environment');
          return;
        }
        throw tokenError;
      }

      const token = tokenResponse?.data;

      if (token) {
        console.log('Expo push token obtained:', token);
        setExpoPushToken(token);
        const user = auth.currentUser;
        if (user) {
          try {
            await set(ref(realtimeDb, `users/${user.uid}/expoPushToken`), token);
            console.log('Push token saved to Firebase for user:', user.uid);
          } catch (saveError) {
            console.error('Error saving push token to Firebase:', saveError);
          }
        } else {
          console.warn('No authenticated user found when trying to save push token');
        }
      } else {
        console.warn('No push token received from Expo');
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
  };

  const handleIncomingReportNotification = async (reportId, options = {}) => {
    try {
      if (!reportId) {
        return;
      }
      const reportRef = ref(realtimeDb, `reports/${reportId}`);
      const snapshot = await get(reportRef);
      if (!snapshot.exists()) {
        return;
      }
      const reportData = { id: reportId, ...snapshot.val() };

      setReports((prevReports) => {
        const filtered = prevReports.filter((report) => report.id !== reportId);
        const updated = [reportData, ...filtered];
        return updated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });

      setAlerts((prevAlerts) => {
        const filtered = prevAlerts.filter((alert) => alert.id !== reportId);
        if (!reportData.accepted && reportData.status === 'pending') {
          const updated = [reportData, ...filtered];
          return updated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return filtered;
      });

      if (options.openReportModal) {
        setShowReportsHistory(true);
        setSelectedReport(reportData);
      }
    } catch (error) {
      console.error('Error handling report notification:', error);
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync();

    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('📬 Notification received:', notification);
      const reportId = notification?.request?.content?.data?.reportId;
      
      // For foreground notifications, explicitly present them
      try {
        await Notifications.presentNotificationAsync({
          title: notification.request.content.title || 'New Emergency Report',
          body: notification.request.content.body || 'You have a new report',
          data: notification.request.content.data,
          sound: true,
        });
        console.log('✅ Notification displayed in notification bar');
      } catch (presentError) {
        console.error('Error presenting notification:', presentError);
      }
      
      if (reportId) {
        await handleIncomingReportNotification(reportId);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const reportId = response?.notification?.request?.content?.data?.reportId;
      if (reportId) {
        await handleIncomingReportNotification(reportId, { openReportModal: true });
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = ref(realtimeDb, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const fullName = userData.fullName || userData.name || '';
            
            if (fullName) {
              // Extract first name
              const firstName = fullName.split(' ')[0];
              setUserName(firstName);
              
              // Get initials (first letter of first name and first letter of last name if available)
              const nameParts = fullName.trim().split(' ');
              if (nameParts.length >= 2) {
                const initials = nameParts[0][0].toUpperCase() + nameParts[nameParts.length - 1][0].toUpperCase();
                setUserInitials(initials);
              } else if (nameParts.length === 1) {
                setUserInitials(nameParts[0][0].toUpperCase());
              }
            } else {
              setUserName('Doctor');
              setUserInitials('@D');
            }
          } else {
            setUserName('Doctor');
            setUserInitials('@D');
          }
        } else {
          setUserName('Doctor');
          setUserInitials('@D');
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName('Doctor');
        setUserInitials('@D');
      } finally {
        setLoading(false);
      }
    };

    fetchUserName();
  }, []);

  // Load alerts and reports
  useEffect(() => {
    const loadReports = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        setLoadingReports(true);
        const reportsRef = ref(realtimeDb, 'reports');
        
        // Listen for real-time updates
        const unsubscribe = onValue(reportsRef, (snapshot) => {
          if (snapshot.exists()) {
            const allReports = snapshot.val();
            const reportsList = [];
            const alertsList = [];
            
            console.log('📊 Loading reports for professional UID:', user.uid);
            console.log('📊 Total reports in database:', Object.keys(allReports).length);
            
            for (const reportId in allReports) {
              const report = allReports[reportId];
              
              // Debug logging
              console.log(`📋 Report ${reportId}:`, {
                assignedProfessionalId: report.assignedProfessionalId,
                userName: report.userName,
                problemType: report.problemType,
                status: report.status,
                accepted: report.accepted
              });
              
              // Check if report is assigned to this professional
              if (report.assignedProfessionalId === user.uid) {
                console.log(`✅ Report ${reportId} matches professional - adding to list`);
                reportsList.push({ id: reportId, ...report });
                
                // Add to alerts if not accepted
                if (!report.accepted && report.status === 'pending') {
                  console.log(`🔔 Report ${reportId} added to alerts (pending)`);
                  alertsList.push({ id: reportId, ...report });
                }
              } else {
                console.log(`❌ Report ${reportId} does not match - assigned to: ${report.assignedProfessionalId}, current user: ${user.uid}`);
              }
            }
            
            // Sort by creation date (newest first)
            reportsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            alertsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            console.log(`📊 Final reports count: ${reportsList.length}`);
            console.log(`🔔 Final alerts count: ${alertsList.length}`);
            
            setReports(reportsList);
            setAlerts(alertsList);
          } else {
            console.log('📊 No reports found in database');
            setReports([]);
            setAlerts([]);
          }
          setLoadingReports(false);
        });

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error loading reports:', error);
        setLoadingReports(false);
      }
    };

    loadReports();
  }, []);

  const handleAccept = async (alert) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Update report status
      const reportRef = ref(realtimeDb, `reports/${alert.id}`);
      await set(reportRef, {
        ...alert,
        accepted: true,
        acceptedAt: new Date().toISOString(),
        status: 'accepted'
      });

      // Set accepted report to show details
      setAcceptedReport(alert);
      
      // Remove from alerts (will update via real-time listener)
      Alert.alert('Success', 'Report accepted successfully');
    } catch (error) {
      console.error('Error accepting report:', error);
      Alert.alert('Error', 'Failed to accept report. Please try again.');
    }
  };

  const handleReject = async (alert) => {
    Alert.alert(
      'Reject Report',
      'Are you sure you want to reject this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const reportRef = ref(realtimeDb, `reports/${alert.id}`);
              await set(reportRef, {
                ...alert,
                status: 'rejected',
                rejectedAt: new Date().toISOString()
              });
              Alert.alert('Success', 'Report rejected');
            } catch (error) {
              console.error('Error rejecting report:', error);
              Alert.alert('Error', 'Failed to reject report. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
      case 'Emergency':
        return '#FF4444';
      case 'medium':
      case 'Severe':
        return '#FF8800';
      default:
        return '#4CAF50';
    }
  };

  const getPriorityText = (painLevel, priority) => {
    if (painLevel === 'Emergency') return 'Critical';
    if (painLevel === 'Severe') return 'Urgent';
    return 'Moderate';
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Banner */}
        <View style={styles.headerBanner}>
          <TouchableOpacity 
            style={styles.profileSection}
            onPress={onNavigateToProfile}
            activeOpacity={0.7}
          >
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImage}>
                {loading ? (
                  <ActivityIndicator size="small" color="#0097B2" />
                ) : (
                  <Text style={styles.profileInitials}>{userInitials}</Text>
                )}
              </View>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color="#333333" style={{ marginLeft: 10 }} />
            ) : (
              <Text style={styles.userName}>Hi, {userName}!</Text>
            )}
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/doktap logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Information Cards */}
        <View style={styles.infoCardsContainer}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <View style={styles.bellIcon}>
                <View style={styles.bellTop} />
                <View style={styles.bellBody} />
                <View style={styles.bellClapper} />
              </View>
            </View>
            <Text style={styles.infoCardNumber}>{loadingReports ? '...' : alerts.length}</Text>
            <Text style={styles.infoCardLabel}>Active Alerts</Text>
          </View>

          <TouchableOpacity 
            style={styles.infoCard}
            onPress={() => setShowReportsHistory(true)}
            activeOpacity={0.7}
          >
            <View style={styles.infoCardIcon}>
              <View style={styles.graphIcon}>
                <View style={styles.graphBar1} />
                <View style={styles.graphBar2} />
                <View style={styles.graphBar3} />
                <View style={styles.graphBar4} />
              </View>
            </View>
            <Text style={styles.infoCardNumber}>{loadingReports ? '...' : reports.length}</Text>
            <Text style={styles.infoCardLabel}>History & Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Incoming Emergency Section */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencySectionTitle}>Incoming Emergency</Text>

          {loadingReports ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0097B2" />
              <Text style={styles.loadingText}>Loading alerts...</Text>
            </View>
          ) : alerts.length === 0 ? (
            <View style={styles.noAlertsContainer}>
              <Text style={styles.noAlertsText}>No active alerts</Text>
            </View>
          ) : (
            alerts.map((alert) => {
              const priorityColor = getPriorityColor(alert.priority || alert.painLevel);
              const priorityText = getPriorityText(alert.painLevel, alert.priority);
              const isCritical = alert.painLevel === 'Emergency' || alert.priority === 'high';
              
              return (
                <View key={alert.id} style={styles.emergencyCard}>
                  <View style={styles.emergencyCardContent}>
                    <View style={[styles.emergencyIndicator, { backgroundColor: priorityColor }]} />
                    <View style={styles.emergencyContent}>
                      <View style={styles.emergencyLeft}>
                        <View style={styles.patientImageContainer}>
                          <View style={styles.patientImage}>
                            <Text style={styles.patientInitials}>
                              {getInitials(alert.userName)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.patientInfo}>
                          <Text style={styles.patientName}>{alert.userName || 'User'}</Text>
                          <Text style={[styles.emergencyType, { color: priorityColor }]}>
                            {priorityText}: {alert.problemType}
                          </Text>
                          {alert.location && (
                            <Text style={styles.locationText}>📍 {alert.location}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.emergencyActions}>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={() => handleReject(alert)}
                      >
                        <Text style={styles.rejectButtonText}>× Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.acceptButton}
                        onPress={() => handleAccept(alert)}
                      >
                        <Text style={styles.acceptButtonText}>✓ Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Accepted Report Details */}
          {acceptedReport && (
            <View style={styles.acceptedReportCard}>
              <View style={styles.acceptedReportHeader}>
                <Text style={styles.acceptedReportTitle}>Accepted Report Details</Text>
                <TouchableOpacity onPress={() => setAcceptedReport(null)}>
                  <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.reportDetails}>
                <Text style={styles.reportDetailLabel}>Patient Name:</Text>
                <Text style={styles.reportDetailValue}>{acceptedReport.userName || 'User'}</Text>
                
                <Text style={styles.reportDetailLabel}>Problem Type:</Text>
                <Text style={styles.reportDetailValue}>{acceptedReport.problemType}</Text>
                
                <Text style={styles.reportDetailLabel}>Description:</Text>
                <Text style={styles.reportDetailValue}>{acceptedReport.injuryDescription}</Text>
                
                <Text style={styles.reportDetailLabel}>Pain Level:</Text>
                <Text style={styles.reportDetailValue}>{acceptedReport.painLevel}</Text>
                
                {acceptedReport.phoneNumber && (
                  <>
                    <Text style={styles.reportDetailLabel}>Phone Number:</Text>
                    <TouchableOpacity 
                      style={styles.callButton}
                      onPress={() => handleCall(acceptedReport.phoneNumber)}
                    >
                      <Text style={styles.callButtonText}>📞 {acceptedReport.phoneNumber}</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {acceptedReport.location && (
                  <>
                    <Text style={styles.reportDetailLabel}>Location:</Text>
                    <Text style={styles.reportDetailValue}>📍 {acceptedReport.location}</Text>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Report History Modal */}
      <Modal
        visible={showReportsHistory}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowReportsHistory(false);
          setSelectedReport(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportHistoryModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Report History</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowReportsHistory(false);
                  setSelectedReport(null);
                }}
              >
                <Text style={styles.modalCloseButton}>×</Text>
              </TouchableOpacity>
            </View>

            {selectedReport ? (
              <ScrollView style={styles.reportDetailScroll}>
                <View style={styles.reportDetailCard}>
                  <View style={styles.reportDetailHeader}>
                    <View style={styles.reportDetailPatientImage}>
                      <Text style={styles.reportDetailPatientInitials}>
                        {getInitials(selectedReport.userName)}
                      </Text>
                    </View>
                    <View style={styles.reportDetailHeaderInfo}>
                      <Text style={styles.reportDetailPatientName}>
                        {selectedReport.userName || 'User'}
                      </Text>
                      <View style={styles.reportStatusBadge}>
                        <Text style={[
                          styles.reportStatusText,
                          selectedReport.status === 'accepted' && styles.reportStatusAccepted,
                          selectedReport.status === 'rejected' && styles.reportStatusRejected,
                          selectedReport.status === 'pending' && styles.reportStatusPending
                        ]}>
                          {selectedReport.status === 'accepted' ? '✓ Accepted' : 
                           selectedReport.status === 'rejected' ? '× Rejected' : 
                           '⏳ Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.reportDetailSection}>
                    <Text style={styles.reportDetailLabel}>Problem Type:</Text>
                    <Text style={styles.reportDetailValue}>{selectedReport.problemType}</Text>
                  </View>

                  <View style={styles.reportDetailSection}>
                    <Text style={styles.reportDetailLabel}>Description:</Text>
                    <Text style={styles.reportDetailValue}>{selectedReport.injuryDescription}</Text>
                  </View>

                  <View style={styles.reportDetailSection}>
                    <Text style={styles.reportDetailLabel}>Pain Level:</Text>
                    <Text style={[styles.reportDetailValue, { color: getPriorityColor(selectedReport.priority || selectedReport.painLevel) }]}>
                      {selectedReport.painLevel}
                    </Text>
                  </View>

                  {selectedReport.phoneNumber && (
                    <View style={styles.reportDetailSection}>
                      <Text style={styles.reportDetailLabel}>Phone Number:</Text>
                      <TouchableOpacity 
                        style={styles.reportCallButton}
                        onPress={() => handleCall(selectedReport.phoneNumber)}
                      >
                        <Text style={styles.reportCallButtonText}>📞 {selectedReport.phoneNumber}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedReport.location && (
                    <View style={styles.reportDetailSection}>
                      <Text style={styles.reportDetailLabel}>Location:</Text>
                      <Text style={styles.reportDetailValue}>📍 {selectedReport.location}</Text>
                    </View>
                  )}

                  {selectedReport.createdAt && (
                    <View style={styles.reportDetailSection}>
                      <Text style={styles.reportDetailLabel}>Reported At:</Text>
                      <Text style={styles.reportDetailValue}>
                        {new Date(selectedReport.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {selectedReport.acceptedAt && (
                    <View style={styles.reportDetailSection}>
                      <Text style={styles.reportDetailLabel}>Accepted At:</Text>
                      <Text style={styles.reportDetailValue}>
                        {new Date(selectedReport.acceptedAt).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.backToListButton}
                    onPress={() => setSelectedReport(null)}
                  >
                    <Text style={styles.backToListButtonText}>← Back to List</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <ScrollView style={styles.reportListScroll}>
                {reports.length === 0 ? (
                  <View style={styles.noReportsContainer}>
                    <Text style={styles.noReportsText}>No reports found</Text>
                  </View>
                ) : (
                  reports.map((report) => (
                    <TouchableOpacity
                      key={report.id}
                      style={styles.reportListItem}
                      onPress={() => setSelectedReport(report)}
                    >
                      <View style={styles.reportListItemHeader}>
                        <View style={styles.reportListItemImage}>
                          <Text style={styles.reportListItemInitials}>
                            {getInitials(report.userName)}
                          </Text>
                        </View>
                        <View style={styles.reportListItemInfo}>
                          <Text style={styles.reportListItemName}>
                            {report.userName || 'User'}
                          </Text>
                          <Text style={styles.reportListItemProblem}>{report.problemType}</Text>
                          <Text style={styles.reportListItemTime}>
                            {new Date(report.createdAt).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.reportListItemStatus}>
                          <View style={[
                            styles.reportStatusIndicator,
                            report.status === 'accepted' && styles.reportStatusIndicatorAccepted,
                            report.status === 'rejected' && styles.reportStatusIndicatorRejected,
                            report.status === 'pending' && styles.reportStatusIndicatorPending
                          ]} />
                          <Text style={[
                            styles.reportListItemStatusText,
                            report.status === 'accepted' && styles.reportStatusTextAccepted,
                            report.status === 'rejected' && styles.reportStatusTextRejected,
                            report.status === 'pending' && styles.reportStatusTextPending
                          ]}>
                            {report.status === 'accepted' ? 'Accepted' : 
                             report.status === 'rejected' ? 'Rejected' : 
                             'Pending'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={onNavigateToMenu}>
          <View style={styles.navIcon}>
            <View style={styles.menuIcon}>
              <View style={styles.menuLine1} />
              <View style={styles.menuLine2} />
              <View style={styles.menuLine3} />
            </View>
          </View>
          <Text style={styles.navText}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <View style={styles.navIcon}>
            <View style={styles.homeIcon}>
              <View style={styles.homeRoof} />
              <View style={styles.homeBase} />
              <View style={styles.homePlus} />
            </View>
          </View>
          <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onNavigateToProfile}>
          <View style={styles.navIcon}>
            <View style={styles.profileIcon}>
              <View style={styles.profileHead} />
              <View style={styles.profileBody} />
            </View>
          </View>
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerBanner: {
    backgroundColor: '#0097B2',
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 100,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0097B2',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoContainer: {
    alignItems: 'right',
    justifyContent: 'center',
    overflow: 'hidden',
    height: 60,
    width: 200,
  },
  logo: {
    width: 300,
    height: 220,
  },
  infoCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#E0F7FA',
    borderRadius: 15,
    padding: 20,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  infoCardIcon: {
    marginBottom: 10,
  },
  bellIcon: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  bellTop: {
    width: 12,
    height: 8,
    borderRadius: 6,
    backgroundColor: '#FF4444',
    marginBottom: -2,
    alignSelf: 'center',
  },
  bellBody: {
    width: 20,
    height: 16,
    borderRadius: 10,
    backgroundColor: '#FF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bellClapper: {
    position: 'absolute',
    bottom: 2,
    left: 9,
    width: 2,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  graphIcon: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 24,
    gap: 3,
  },
  graphBar1: {
    width: 4,
    height: 8,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  graphBar2: {
    width: 4,
    height: 14,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  graphBar3: {
    width: 4,
    height: 18,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  graphBar4: {
    width: 4,
    height: 12,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  infoCardNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#666666',
  },
  emergencySection: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  emergencySectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  emergencyCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  emergencyCardContent: {
    flex: 1,
  },
  emergencyIndicator: {
    width: 6,
  },
  criticalIndicator: {
    backgroundColor: '#FF4444',
  },
  urgentIndicator: {
    backgroundColor: '#FF8800',
  },
  emergencyContent: {
    flex: 1,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientImageContainer: {
    marginRight: 12,
  },
  patientImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  emergencyType: {
    fontSize: 14,
    fontWeight: '600',
  },
  criticalText: {
    color: '#FF4444',
  },
  urgentText: {
    color: '#FF8800',
  },
  emergencyRight: {
    alignItems: 'flex-end',
  },
  distance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: '#666666',
  },
  emergencyActions: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    width: '100%',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6ddef2',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0097B2',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingBottom: 25,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navItemActive: {
    // Active state styling
  },
  navIcon: {
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  menuIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  menuLine1: {
    width: 20,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  menuLine2: {
    width: 20,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  menuLine3: {
    width: 20,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  homeIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    marginBottom: -1,
  },
  homeBase: {
    width: 16,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  homePlus: {
    position: 'absolute',
    top: 8,
    right: -2,
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginBottom: 2,
  },
  profileBody: {
    width: 14,
    height: 8,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  navText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  navTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  noAlertsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAlertsText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  acceptedReportCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  acceptedReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  acceptedReportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  closeButton: {
    fontSize: 24,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  reportDetails: {
    gap: 10,
  },
  reportDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  reportDetailValue: {
    fontSize: 16,
    color: '#000',
    marginTop: 4,
  },
  callButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reportHistoryModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0097B2',
  },
  modalCloseButton: {
    fontSize: 28,
    color: '#0097B2',
    fontWeight: 'bold',
  },
  reportListScroll: {
    flex: 1,
    padding: 20,
  },
  reportListItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reportListItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportListItemImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  reportListItemInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
  },
  reportListItemInfo: {
    flex: 1,
  },
  reportListItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  reportListItemProblem: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  reportListItemTime: {
    fontSize: 12,
    color: '#999999',
  },
  reportListItemStatus: {
    alignItems: 'flex-end',
  },
  reportStatusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  reportStatusIndicatorAccepted: {
    backgroundColor: '#4CAF50',
  },
  reportStatusIndicatorRejected: {
    backgroundColor: '#FF4444',
  },
  reportStatusIndicatorPending: {
    backgroundColor: '#FF8800',
  },
  reportListItemStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportStatusTextAccepted: {
    color: '#4CAF50',
  },
  reportStatusTextRejected: {
    color: '#FF4444',
  },
  reportStatusTextPending: {
    color: '#FF8800',
  },
  noReportsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noReportsText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  reportDetailScroll: {
    flex: 1,
    padding: 20,
  },
  reportDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
  },
  reportDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  reportDetailPatientImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  reportDetailPatientInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666666',
  },
  reportDetailHeaderInfo: {
    flex: 1,
  },
  reportDetailPatientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  reportStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
  },
  reportStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportStatusAccepted: {
    color: '#4CAF50',
  },
  reportStatusRejected: {
    color: '#FF4444',
  },
  reportStatusPending: {
    color: '#FF8800',
  },
  reportDetailSection: {
    marginBottom: 20,
  },
  reportCallButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  reportCallButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backToListButton: {
    backgroundColor: '#0097B2',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  backToListButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

