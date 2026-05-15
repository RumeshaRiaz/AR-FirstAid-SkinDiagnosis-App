import React, { useRef, useState, useEffect } from 'react';
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
  Modal
} from 'react-native';
import { auth } from '../config/firebaseConfig';
import { ref, get, update, onValue } from 'firebase/database';
import { realtimeDb } from '../config/firebaseConfig';

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
  const initializedAlertsRef = useRef(false);
  const knownAlertIdsRef = useRef(new Set());

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

  const isReportForCurrentProfessional = (report, userId) => {
    return report.assignedProfessionalId === userId || report.forwardedToProfessionalId === userId;
  };

  const isActiveReportAlert = (report) => {
    return !report.accepted && (report.status === 'pending' || report.status === 'forwarded');
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'responded':
        return 'Responded';
      case 'completed':
        return 'Completed';
      case 'declined':
        return 'Declined';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'forwarded':
        return 'Forwarded';
      default:
        return 'Pending';
    }
  };

  const getReportTime = (report) => {
    return report.forwardedAt || report.createdAt || 0;
  };

  const canCompleteReport = (report) => {
    return report && !['completed', 'declined', 'rejected'].includes(report.status);
  };

  // Load alerts and reports
  useEffect(() => {
    let unsubscribeReports = null;
    let isMounted = true;

    const loadReports = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoadingReports(false);
          return;
        }

        const userSnapshot = await get(ref(realtimeDb, `users/${user.uid}`));
        const userData = userSnapshot.exists() ? userSnapshot.val() : null;
        if (userData?.userType !== 'professional') {
          setReports([]);
          setAlerts([]);
          setLoadingReports(false);
          return;
        }

        setLoadingReports(true);
        const reportsRef = ref(realtimeDb, 'reports');
        
        // Listen for real-time updates
        unsubscribeReports = onValue(reportsRef, (snapshot) => {
          if (!isMounted || auth.currentUser?.uid !== user.uid) {
            return;
          }

          if (snapshot.exists()) {
            const allReports = snapshot.val();
            const reportsList = [];
            const alertsList = [];
            
            for (const reportId in allReports) {
              const report = allReports[reportId];
              // Reports can be assigned directly by the app or forwarded later by admin.
              if (isReportForCurrentProfessional(report, user.uid)) {
                reportsList.push({ id: reportId, ...report });
                
                // Add to alerts if not accepted
                if (isActiveReportAlert(report)) {
                  alertsList.push({ id: reportId, ...report });
                }
              }
            }
            
            // Sort by creation date (newest first)
            reportsList.sort((a, b) => new Date(getReportTime(b)) - new Date(getReportTime(a)));
            alertsList.sort((a, b) => new Date(getReportTime(b)) - new Date(getReportTime(a)));

            const currentAlertIds = new Set(alertsList.map((alert) => alert.id));
            const newForwardedAlert = alertsList.find((alert) => (
              alert.status === 'forwarded' &&
              !knownAlertIdsRef.current.has(alert.id)
            ));

            if (initializedAlertsRef.current && newForwardedAlert) {
              Alert.alert(
                'New Forwarded Report',
                `${newForwardedAlert.userName || 'A patient'} has a new ${newForwardedAlert.problemType || 'medical'} report.`
              );
            }

            initializedAlertsRef.current = true;
            knownAlertIdsRef.current = currentAlertIds;
            
            setReports(reportsList);
            setAlerts(alertsList);
          } else {
            setReports([]);
            setAlerts([]);
          }
          setLoadingReports(false);
        });
      } catch (error) {
        console.error('Error loading reports:', error);
        setLoadingReports(false);
      }
    };

    loadReports();

    return () => {
      isMounted = false;
      if (unsubscribeReports) {
        unsubscribeReports();
      }
    };
  }, []);

  const handleAccept = async (alert) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Update report status
      const reportRef = ref(realtimeDb, `reports/${alert.id}`);
      await update(reportRef, {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
        status: 'responded'
      });

      // Set accepted report to show details
      setAcceptedReport({
        ...alert,
        accepted: true,
        acceptedAt: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
        status: 'responded',
      });
      
      // Remove from alerts (will update via real-time listener)
      Alert.alert('Success', 'Report accepted successfully');
    } catch (error) {
      console.error('Error accepting report:', error);
      Alert.alert('Error', 'Failed to accept report. Please try again.');
    }
  };

  const handleReject = async (alert) => {
    Alert.alert(
      'Decline Report',
      'Are you sure you want to decline this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const reportRef = ref(realtimeDb, `reports/${alert.id}`);
              await update(reportRef, {
                status: 'declined',
                accepted: false,
                declinedAt: new Date().toISOString(),
                rejectedAt: new Date().toISOString()
              });
              Alert.alert('Success', 'Report declined');
            } catch (error) {
              console.error('Error rejecting report:', error);
              Alert.alert('Error', 'Failed to reject report. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleCaseSolved = async (report) => {
    Alert.alert(
      'Case Solved',
      'Mark this case as solved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Solved',
          onPress: async () => {
            try {
              const reportRef = ref(realtimeDb, `reports/${report.id}`);
              const now = new Date().toISOString();
              await update(reportRef, {
                accepted: true,
                acceptedAt: report.acceptedAt || now,
                respondedAt: report.respondedAt || now,
                status: 'completed',
                completedAt: now,
                solvedAt: now,
              });
              const completedReport = {
                ...report,
                accepted: true,
                acceptedAt: report.acceptedAt || now,
                respondedAt: report.respondedAt || now,
                status: 'completed',
                completedAt: now,
                solvedAt: now,
              };
              setAcceptedReport((current) => current?.id === report.id ? completedReport : current);
              setSelectedReport((current) => current?.id === report.id ? completedReport : current);
              Alert.alert('Success', 'Case marked as solved');
            } catch (error) {
              console.error('Error completing report:', error);
              Alert.alert('Error', 'Failed to mark case as solved. Please try again.');
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
                        <Text style={styles.rejectButtonText}>× Decline</Text>
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
                {canCompleteReport(acceptedReport) && (
                  <TouchableOpacity
                    style={styles.caseSolvedButton}
                    onPress={() => handleCaseSolved(acceptedReport)}
                  >
                    <Text style={styles.caseSolvedButtonText}>CASE SOLVED</Text>
                  </TouchableOpacity>
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
                          (selectedReport.status === 'accepted' || selectedReport.status === 'responded' || selectedReport.status === 'completed') && styles.reportStatusAccepted,
                          (selectedReport.status === 'rejected' || selectedReport.status === 'declined') && styles.reportStatusRejected,
                          (selectedReport.status === 'pending' || selectedReport.status === 'forwarded') && styles.reportStatusPending
                        ]}>
                          {getStatusLabel(selectedReport.status)}
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

                  {canCompleteReport(selectedReport) && (
                    <TouchableOpacity
                      style={styles.caseSolvedButton}
                      onPress={() => handleCaseSolved(selectedReport)}
                    >
                      <Text style={styles.caseSolvedButtonText}>CASE SOLVED</Text>
                    </TouchableOpacity>
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
                            {new Date(getReportTime(report)).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.reportListItemStatus}>
                          <View style={[
                            styles.reportStatusIndicator,
                            (report.status === 'accepted' || report.status === 'responded' || report.status === 'completed') && styles.reportStatusIndicatorAccepted,
                            (report.status === 'rejected' || report.status === 'declined') && styles.reportStatusIndicatorRejected,
                            (report.status === 'pending' || report.status === 'forwarded') && styles.reportStatusIndicatorPending
                          ]} />
                          <Text style={[
                            styles.reportListItemStatusText,
                            (report.status === 'accepted' || report.status === 'responded' || report.status === 'completed') && styles.reportStatusTextAccepted,
                            (report.status === 'rejected' || report.status === 'declined') && styles.reportStatusTextRejected,
                            (report.status === 'pending' || report.status === 'forwarded') && styles.reportStatusTextPending
                          ]}>
                            {getStatusLabel(report.status)}
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
  caseSolvedButton: {
    backgroundColor: '#0097B2',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  caseSolvedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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

